import mongoose from "mongoose"
import bcrypt from "bcryptjs"

const userSchema = new mongoose.Schema({
    email:{
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password:{
        type: String,
        required: true,
        minlength: 6
    },
    name:{
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps:true
})

userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next()

    try{
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    }catch(err){
        next(err);
    }
});

userSchema.methods.comparePassword = function(pass){
    return bcrypt.compare(pass, this.password);
}

const User = mongoose.model("User", userSchema);
export default User;